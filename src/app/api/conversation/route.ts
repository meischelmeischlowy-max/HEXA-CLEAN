import { NextResponse } from "next/server";
import {
  conversationEngine,
  ConversationRole,
} from "@/lib/conversation/conversationEngine";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json(
      {
        success: false,
        message: "Missing sessionId",
      },
      { status: 400 }
    );
  }

  const messages = conversationEngine.getMessages(sessionId);

  return NextResponse.json({
    success: true,
    sessionId,
    messages,
  });
}

export async function POST(request: Request) {
  const body = await request.json();

  const sessionId = body.sessionId;
  const role = body.role as ConversationRole;
  const content = body.content;

  if (!sessionId || !role || !content) {
    return NextResponse.json(
      {
        success: false,
        message: "Missing sessionId, role or content",
      },
      { status: 400 }
    );
  }

  if (!["user", "assistant", "system"].includes(role)) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid role",
      },
      { status: 400 }
    );
  }

  const message = conversationEngine.addMessage(sessionId, role, content);

  return NextResponse.json({
    success: true,
    message: "Message saved",
    data: message,
  });
}