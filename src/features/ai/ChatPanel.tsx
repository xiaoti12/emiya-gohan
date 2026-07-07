type ChatPanelProps = {
  placeholder?: string;
};

export function ChatPanel({ placeholder = "想问什么菜？" }: ChatPanelProps) {
  return <div>{placeholder}</div>;
}
