export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: "new" | "ongoing" | "resolved";
  priority?: "high" | "normal";
  author: {
    name: string;
    avatar: string;
  };
  timestamp: string;
}

export const tickets: Ticket[] = [
  {
    id: "2023-C5123",
    title: "How to deposit money to my portal?",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    status: "new",
    author: {
      name: "John Snow",
      avatar: "/avatar.jpg",
    },
    timestamp: "12:45 AM",
  },
  {
    id: "2023-C5124",
    title: "Unable to reset my account password",
    description:
      "User reports they are not receiving reset password emails. Need to check SMTP configuration and spam filters.",
    status: "ongoing",
    priority: "high",
    author: {
      name: "Sara Lee",
      avatar: "/avatar.jpg",
    },
    timestamp: "09:15 AM",
  },
  {
    id: "2023-C5125",
    title: "Question about billing cycle",
    description:
      "Customer asked for clarification on next billing cycle and proration rules for upgrades.",
    status: "resolved",
    author: {
      name: "John Snow",
      avatar: "/avatar.jpg",
    },
    timestamp: "Yesterday",
  },
];


