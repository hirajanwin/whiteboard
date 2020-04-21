defmodule Mix.Tasks.CleanBoards do
  use Mix.Task
  alias Whiteboard.Boards

  def run(_) do
    Mix.Task.run "app.start"

    count = Boards.clean_old_boards
    IO.puts("Removed #{count} old boards")
  end

end