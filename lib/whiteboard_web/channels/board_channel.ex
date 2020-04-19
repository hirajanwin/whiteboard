defmodule WhiteboardWeb.BoardChannel do
  use WhiteboardWeb, :channel
  use Phoenix.Socket
  alias Whiteboard.Boards

  def join("board:lobby", payload, socket) do
    socket = assign(socket, :board_code, "lobby")
    {:ok, %{strokes: []}, socket}
  end

  def join("board:" <> code, payload, socket) do
    socket = assign(socket, :board_code, code)
    {:ok, %{strokes: Boards.get_board_strokes(code)}, socket}
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
        Boards.add_stroke(board_code, payload["stroke"])
      "undo" ->
        Boards.undo_stroke(board_code)
      "redo" ->
        Boards.add_stroke(board_code, payload["stroke"])
      "reset" ->
        Boards.reset_board(board_code)
    end
  end

end
