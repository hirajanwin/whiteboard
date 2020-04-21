defmodule WhiteboardWeb.BoardController do
  use WhiteboardWeb, :controller

  alias Whiteboard.Boards

  def new(conn, _params) do
    with {:ok, board} <- Boards.create_board(%{"code" => Boards.create_code()}) do
      conn
      |> put_flash(:info, "Board created")
      |> redirect(to: Routes.board_path(conn, :show, board.code))
    end
  end

  def show(conn, %{"code" => code}) do
    board = Boards.get_board_by_code!(code)
    render(conn, "show.html", board: board, page_title: board.code)
  end

end
