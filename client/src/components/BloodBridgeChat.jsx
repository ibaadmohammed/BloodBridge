import { useEffect } from "react";
import { createChat } from "@n8n/chat";
import "@n8n/chat/style.css";

export default function BloodBridgeChat() {
  useEffect(() => {
    createChat({
      webhookUrl:
        "https://ibaad123.app.n8n.cloud/webhook/f3843ffd-1caf-4d13-afd3-69005c46158c/chat",
      mode: "window",
      showWelcomeScreen: false,
      initialMessages: [
        "Hello There! 👋",
        "Welcome to BloodBridge. How can I help you today?",
      ],
      i18n: {
        en: {
          title: "BloodBridge AI Assistant",
          subtitle: "Your blood donation support assistant",
          footer: "",
          getStarted: "Start Chat",
          inputPlaceholder: "Ask me anything...",
        },
      },
    });
  }, []);

  return null;
}
