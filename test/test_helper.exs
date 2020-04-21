ExUnit.start()
Ecto.Adapters.SQL.Sandbox.mode(Whiteboard.Repo, :manual)
Mox.defmock(BoardsMock, for: Whiteboard.Boards.BoardsBehaviour)
