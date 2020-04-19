defmodule Whiteboard.Repo.Migrations.CreateStrokes do
  use Ecto.Migration

  def change do
    create table(:strokes) do
      add :stroke, :map
      add :order, :serial
      add :board_id, references(:boards, on_delete: :nothing)

      timestamps()
    end

    create index(:strokes, [:board_id])
  end
end
