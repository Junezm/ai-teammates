export default async function ChatPage(props: PageProps<"/chats/[chatId]">) {
  const { chatId } = await props.params

  return <p>{chatId}</p>
}
