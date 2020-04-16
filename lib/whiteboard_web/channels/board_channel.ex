defmodule WhiteboardWeb.BoardChannel do
  use WhiteboardWeb, :channel

  def join("board:lobby", payload, socket) do
    {:ok, socket}
  end

  def handle_in("stroke", payload, socket) do
    broadcast socket, "stroke", payload
    {:noreply, socket}
  end

end
