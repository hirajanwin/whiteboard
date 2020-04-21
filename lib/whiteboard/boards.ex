defmodule Whiteboard.Boards do
  @moduledoc """
  The Boards context.
  """

  import Ecto.Query, warn: false
  alias Ecto
  alias Whiteboard.Repo

  alias Whiteboard.Boards.Board
  alias Whiteboard.Boards.Stroke

  @board_max_age 7 #days

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

  def get_boards_before(date) do
    from(b in Board, where: b.inserted_at < ^date)
    |> Repo.all
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
    stroke = get_last_stroke(board_code)
    if stroke do
      Repo.delete stroke
    end
  end

  def get_last_stroke(board_code) do
    from(s in Stroke,
      join: b in Board, on: s.board_id == b.id,
      where: b.code == ^board_code,
      order_by: [desc: s.order])
    |> Repo.all
    |> List.first
  end

  def reset_board(board_code) do
    from(s in Stroke,
      join: b in Board, on: s.board_id == b.id,
      where: b.code == ^board_code)
    |> Repo.delete_all
  end

  def get_board_strokes(board_code) do
    from(s in Stroke,
      join: b in Board, on: s.board_id == b.id,
      where: b.code == ^board_code,
      order_by: s.order,
      select: s.stroke)
    |> Repo.all
  end

  def clean_old_boards do
    timeout_date = Timex.today
      |> Timex.shift(days: -@board_max_age)
      |> Timex.to_naive_datetime

    boards = get_boards_before(timeout_date)
    count = Enum.count(boards)
    Enum.map(boards, fn board -> Repo.delete(board) end)

    count
  end

end
