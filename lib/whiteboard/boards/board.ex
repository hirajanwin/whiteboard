defmodule Whiteboard.Boards.Board do
  use Ecto.Schema
  import Ecto.Changeset
  alias Whiteboard.Boards.Stroke

  schema "boards" do
    field :code, :string

    has_many :strokes, Stroke

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
