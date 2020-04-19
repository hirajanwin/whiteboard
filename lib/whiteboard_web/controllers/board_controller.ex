defmodule WhiteboardWeb.BoardController do
  use WhiteboardWeb, :controller

  alias Whiteboard.Boards
  alias Whiteboard.Boards.Board

  def new(conn, _params) do
    changeset = Boards.change_board(%Board{})

    with {:ok, board} <- Boards.create_board(%{"code" => Boards.create_code()}) do
      conn
      |> put_flash(:info, "Board created")
      |> redirect(to: Routes.board_path(conn, :show, board.code))
    end
  end

  def show(conn, %{"code" => code}) do
    board = Boards.get_board_by_code!(code)
    render(conn, "show.html", board: board, title: board.code)
  end

end
