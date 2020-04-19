defmodule WhiteboardWeb.Router do
  use WhiteboardWeb, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_flash
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/", WhiteboardWeb do
    pipe_through :browser

    get "/", PageController, :index
    get "/about", PageController, :about

    get "/boards/new", BoardController, :new
    get "/boards/:code", BoardController, :show
  end

end
