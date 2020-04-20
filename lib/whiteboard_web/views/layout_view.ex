defmodule WhiteboardWeb.LayoutView do
  use WhiteboardWeb, :view

  def has_flash(conn, type) do
    get_flash(conn, type) != nil
  end

  def page_title(conn) do
    if Map.has_key?(conn.assigns, :page_title) do
      "Whiteboard · " <> conn.assigns[:page_title]
    else
      "Whiteboard"
    end
  end
end
