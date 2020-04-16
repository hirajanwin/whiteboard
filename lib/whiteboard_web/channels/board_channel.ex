defmodule WhiteboardWeb.BoardChannel do
  use WhiteboardWeb, :channel

  def join("board:lobby", payload, socket) do
    {:ok, socket}
  end

  def handle_in("notepad-cmd", payload, socket) do
    broadcast socket, "notepad-cmd", payload
    {:noreply, socket}
  end

end
