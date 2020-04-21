defmodule WhiteboardWeb.PageControllerTest do
  use WhiteboardWeb.ConnCase

  test "GET /", %{conn: conn} do
    conn = get(conn, "/")
    assert html_response(conn, 200) =~ "Whiteboard"
  end

  test "GET /about", %{conn: conn} do
    conn = get(conn, "/about")
    assert html_response(conn, 200) =~ "About"
  end

end
