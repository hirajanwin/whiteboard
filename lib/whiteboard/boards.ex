defmodule Whiteboard.Boards do
  @moduledoc """
  The Boards context.
  """

  import Ecto.Query, warn: false
  alias Ecto
  alias Whiteboard.Repo

  alias Whiteboard.Boards.Board
  alias Whiteboard.Boards.Stroke

  @doc """
  Returns the list of boards.

  ## Examples

      iex> list_boards()
      [%Board{}, ...]

  """
  def list_boards do
    Repo.all(Board)
  end

  @doc """
  Gets a single board.

  Raises `Ecto.NoResultsError` if the Board does not exist.

  ## Examples

      iex> get_board!(123)
      %Board{}

      iex> get_board!(456)
      ** (Ecto.NoResultsError)

  """
  def get_board!(id), do: Repo.get!(Board, id)

  def get_board_by_code!(code) do
    from(b in Board, where: b.code == ^code)
    |> Repo.one!
  end

  @doc """
  Creates a board.

  ## Examples

      iex> create_board(%{field: value})
      {:ok, %Board{}}

      iex> create_board(%{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def create_board(attrs \\ %{}) do
    %Board{}
    |> Board.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a board.

  ## Examples

      iex> update_board(board, %{field: new_value})
      {:ok, %Board{}}

      iex> update_board(board, %{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def update_board(%Board{} = board, attrs) do
    board
    |> Board.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a board.

  ## Examples

      iex> delete_board(board)
      {:ok, %Board{}}

      iex> delete_board(board)
      {:error, %Ecto.Changeset{}}

  """
  def delete_board(%Board{} = board) do
    Repo.delete(board)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking board changes.

  ## Examples

      iex> change_board(board)
      %Ecto.Changeset{source: %Board{}}

  """
  def change_board(%Board{} = board) do
    Board.changeset(board, %{})
  end

  def create_code() do
    uuid = Ecto.UUID.generate()
    :crypto.hash(:md5 , uuid)
    |> Base.encode32()
    |> String.slice(0, 8)
    |> String.upcase()
  end

  def add_stroke(board_code, stroke_data) do
    board = get_board_by_code!(board_code)
    stroke = %Stroke{
      stroke: stroke_data,
      board_id: board.id
    }
    Repo.insert!(stroke)
  end

  def undo_stroke(board_code) do

  end

  def redo_stroke(board_code) do

  end

  def reset_board(board_code) do

  end

  def get_board_strokes(board_code) do
    from(s in Stroke,
      join: b in Board, on: s.board_id == b.id,
      where: b.code == ^board_code,
      select: s.stroke)
    |> Repo.all
  end

end
