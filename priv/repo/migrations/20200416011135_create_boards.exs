defmodule Whiteboard.Repo.Migrations.CreateBoards do
  use Ecto.Migration

  def change do
    create table(:boards) do
      add :code, :string

      timestamps()
    end

    create unique_index(:boards, [:code])
  end
end
