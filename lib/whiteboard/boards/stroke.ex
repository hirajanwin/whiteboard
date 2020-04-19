defmodule Whiteboard.Boards.Stroke do
  use Ecto.Schema
  import Ecto.Changeset
  alias Whiteboard.Boards.Board

  schema "strokes" do
    field :order, :integer
    field :stroke, :map
    # field :board_id, :id

    belongs_to :board, Board

    timestamps()
  end

  @doc false
  def changeset(stroke, attrs) do
    stroke
    |> cast(attrs, [:stroke])
    |> validate_required([:stroke])
  end
end
