defmodule WhiteboardWeb.LayoutView do
  use WhiteboardWeb, :view

  def has_flash(conn, type) do
    get_flash(conn, type) != nil
  end
end
