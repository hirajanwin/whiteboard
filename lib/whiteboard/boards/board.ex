defmodule Whiteboard.Boards.Board do
  use Ecto.Schema
  import Ecto.Changeset

  schema "boards" do
    field :code, :string

    timestamps()
  end

  @doc false
  def changeset(board, attrs) do
    board
    |> cast(attrs, [:code])
    |> validate_required([:code])
    |> unique_constraint(:code)
  end
end
