defmodule WhiteboardWeb.BoardChannel do
  use WhiteboardWeb, :channel

  defp boards, do: Application.get_env(:whiteboard, :boards)

  def join("board:lobby", _payload, socket) do
    socket = Phoenix.Socket.assign(socket, :board_code, "lobby")
    {:ok, %{strokes: []}, socket}
  end

  def join("board:" <> code, _payload, socket) do
    socket = Phoenix.Socket.assign(socket, :board_code, code)
    {:ok, %{strokes: boards().get_board_strokes(code)}, socket}
  end

  def handle_in("notepad-cmd", payload, socket) do
    if socket.assigns.board_code != "lobby" do
      save_command(socket.assigns.board_code, payload)
    end

    broadcast socket, "notepad-cmd", payload
    {:noreply, socket}
  end

  defp save_command(board_code, %{"type" => type} = payload) do
    case type do
      "stroke" ->
        boards().add_stroke(board_code, payload["stroke"])
      "undo" ->
        boards().undo_stroke(board_code)
      "redo" ->
        boards().add_stroke(board_code, payload["stroke"])
      "reset" ->
        boards().reset_board(board_code)
    end
  end

end
