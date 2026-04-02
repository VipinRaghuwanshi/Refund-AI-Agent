import * as z from "zod";
import { createAgent, tool, humanInTheLoopMiddleware } from "langchain";
import { ChatGroq } from "@langchain/groq";
import { MemorySaver, Command } from "@langchain/langgraph";
import "dotenv/config";

// 👉 GLOBAL interrupts
let interrupts = [];

// 📩 EMAIL DATA
const gmailEmails = {
  messages: [
    {
      id: "1",
      from: "john.doe@example.com",
      subject: "Refund Request - JavaScript Course",
      snippet: "Course content not as expected",
      course: "JavaScript Masterclass",
      price: 49,
      orderId: "ORD-1001",
      date: "2024-11-04",
      status: "pending",
    },
    {
      id: "2",
      from: "mike.chen@example.com",
      subject: "Refund - Full Stack Course",
      snippet: "Facing financial issues",
      course: "Full Stack Bootcamp",
      price: 99,
      orderId: "ORD-1002",
      date: "2024-11-02",
      status: "pending",
    },
    {
      id: "3",
      from: "alex.smith@example.com",
      subject: "Refund Python Course",
      snippet: "Not satisfied with content",
      course: "Python for Beginners",
      price: 39,
      orderId: "ORD-1003",
      date: "2024-11-01",
      status: "pending",
    },
    {
      id: "4",
      from: "emma.watson@example.com",
      subject: "React Course Refund",
      snippet: "Too basic for me",
      course: "React Advanced",
      price: 59,
      orderId: "ORD-1004",
      date: "2024-10-30",
      status: "pending",
    },
    {
      id: "5",
      from: "chris.evans@example.com",
      subject: "Refund Node.js Course",
      snippet: "Technical issues",
      course: "Node.js Mastery",
      price: 79,
      orderId: "ORD-1005",
      date: "2024-10-28",
      status: "pending",
    },

    // non refund
    {
      id: "6",
      from: "noreply@test.com",
      subject: "Order Confirmation",
      snippet: "Your order is confirmed",
      course: "React Advanced",
      price: 59,
      orderId: "ORD-1006",
      date: "2024-10-25",
      status: "completed",
    },
  ],
};
// 🤖 LLM
const llm = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "openai/gpt-oss-120b",
  temperature: 0,
});

// 🛠️ TOOLS

// ✅ get emails
const getEmails = tool(
  () => {
    const emails = gmailEmails.messages.filter((m) =>
      m.subject.toLowerCase().includes("refund")
    );

    // 🔥 STRING FORMAT (IMPORTANT)
    return JSON.stringify(emails);
  },
  {
    name: "get_emails",
    description: "Get all refund request emails with full details",
  }
);

// ✅ refund tool (NO interrupt here)
const refund = tool(
  async ({ emails }) => {
    const list = emails.map((e) => e.from).join(", ");
    return `✅ Refund processed for: ${list}`;
  },
  {
    name: "refund",
    schema: z.object({
      emails: z.array(z.any()), // 🔥 change
    }),
  }
);

// 🤖 AGENT
const agent = createAgent({
  model: llm,
  tools: [getEmails, refund],
  middleware: [
    humanInTheLoopMiddleware({
      interruptOn: { refund: true },
    }),
  ],
  checkpointer: new MemorySaver(),

  // 🔥🔥 MOST IMPORTANT
  systemPrompt: `
You are a smart refund assistant.

When returning emails:
- Format nicely like:
Name: email
Course: course
Price: price

Always use tools when needed.
`,
});

// 🚀 MAIN FUNCTION
export async function runAgent(message, decision = null, id = null) {
  let response;

  try {
    // ✅🔥 1. DIRECT CARD ACTION (MOST IMPORTANT FIX)
    if (decision && id) {
      const email = gmailEmails.messages.find((m) => m.id === id);

      if (!email) {
        return {
          type: "error",
          message: "Email not found",
        };
      }

      email.status = decision === "approve" ? "approved" : "rejected";

      return {
        type: "done",
        message: `✅ ${decision.toUpperCase()} done for ${email.from}`,
        data: gmailEmails.messages.filter((m) =>
          m.subject.toLowerCase().includes("refund")
        ),
      };
    }

    // ✅ HITL Decision (AI buttons)
    if (decision && interrupts.length) {
      response = await agent.invoke(
        new Command({
          resume: {
            [interrupts[0].id]: {
              decisions: [{ type: decision, content: String(message || "") }],
            },
          },
        }),
        { configurable: { thread_id: "1" } }
      );
    } else {
      // ✅ Normal AI chat
      response = await agent.invoke(
        {
          messages: [
            {
              role: "user",
              content: String(message || ""),
            },
          ],
        },
        { configurable: { thread_id: "1" } }
      );
    }

    // ✅ Interrupt handle (safe)
    if (response?.__interrupt__?.length) {
      interrupts = [response.__interrupt__[0]];

      return {
        type: "approval_required",
        message:
          response?.__interrupt__?.[0]?.value?.actionRequests?.[0]?.description ||
          "Approval required",
        options:
          response?.__interrupt__?.[0]?.value?.reviewConfigs?.[0]?.allowedDecisions || [],
      };
    }

    // ✅🔥 SAFE MESSAGE EXTRACT (NO CRASH EVER)
    let finalMessage = "✅ Done";
    const lastMsg = response?.messages?.at(-1);

    if (typeof lastMsg?.content === "string") {
      finalMessage = lastMsg.content;
    } else if (Array.isArray(lastMsg?.content)) {
      finalMessage = lastMsg.content.map((c) => c.text || "").join(" ");
    } else if (typeof lastMsg?.content === "object") {
      finalMessage = JSON.stringify(lastMsg.content);
    }

    // ✅ Final response
    return {
      type: "done",
      message: finalMessage,
      data:
        typeof message === "string" &&
        message.toLowerCase().includes("refund")
          ? gmailEmails.messages.filter((m) =>
              m.subject.toLowerCase().includes("refund")
            )
          : null,
    };
  } catch (err) {
    console.error("❌ ERROR:", err);

    return {
      type: "error",
      message: err.message || "Something went wrong",
    };
  }
}