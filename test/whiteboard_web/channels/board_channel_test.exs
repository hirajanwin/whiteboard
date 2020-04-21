defmodule WhiteboardWeb.BoardChannelTest do
  use WhiteboardWeb.ChannelCase
  import Mox

  setup do
    Mox.stub_with(BoardsMock, Whiteboard.Boards)
    verify_on_exit!()
  end

  test "notepad-cmd is broadcast to channel" do
    socket = make_socket("lobby")
    push socket, "notepad-cmd", %{"type" => "test"}
    assert_broadcast "notepad-cmd", %{"type" => "test"}
  end

  test "stroke notepad-cmd saves stroke to board" do
    code = "ABCDEFGH"
    socket = make_socket(code)

    BoardsMock
    |> expect(:add_stroke, fn ^code, _stroke -> :ok end)

    push socket, "notepad-cmd", %{
      "type" => "stroke",
      "stroke" => %{}
    }
    assert_broadcast "notepad-cmd", %{"type" => "stroke"}
  end

  test "undo notepad-cmd asks Boards to undo stroke" do
    code = "ABCDEFGH"
    socket = make_socket(code)

    BoardsMock
    |> expect(:undo_stroke, fn ^code -> :ok end)

    push socket, "notepad-cmd", %{"type" => "undo"}
    assert_broadcast "notepad-cmd", %{"type" => "undo"}
  end

  test "redo notepad-cmd asks Boards to add stroke" do
    code = "ABCDEFGH"
    socket = make_socket(code)

    BoardsMock
    |> expect(:add_stroke, fn ^code, _stroke -> :ok end)

    push socket, "notepad-cmd", %{
      "type" => "redo",
      "stroke" => %{}
    }
    assert_broadcast "notepad-cmd", %{"type" => "redo"}
  end

  defp make_socket(code) do
    {:ok, _, socket} =
      socket(WhiteboardWeb.UserSocket, "user_id", %{some: :assign})
      |> subscribe_and_join(WhiteboardWeb.BoardChannel, "board:#{code}")

    socket
  end

end
