defmodule WhiteboardWeb.BoardControllerTest do
  use WhiteboardWeb.ConnCase

  alias Whiteboard.Boards

  @create_attrs %{code: "ABCDEFGH"}

  def fixture(:board) do
    {:ok, board} = Boards.create_board(@create_attrs)
    board
  end

  describe "new board" do
    test "creates a new board", %{conn: conn} do
      conn = get(conn, Routes.board_path(conn, :new))

      assert %{code: code} = redirected_params(conn)
      assert redirected_to(conn) == Routes.board_path(conn, :show, code)
    end
  end

end
