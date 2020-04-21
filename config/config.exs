# This file is responsible for configuring your application
# and its dependencies with the aid of the Mix.Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.

# General application configuration
use Mix.Config

config :whiteboard,
  ecto_repos: [Whiteboard.Repo]

# Configures the endpoint
config :whiteboard, WhiteboardWeb.Endpoint,
  url: [host: "localhost"],
  secret_key_base: "yVTn3UPGrAa9XZwMZMNLC9Aofu4GzqpMou0GfRJB6ViMMcdV2ak+Jun3EE41kHdc",
  render_errors: [view: WhiteboardWeb.ErrorView, accepts: ~w(html json)],
  pubsub: [name: Whiteboard.PubSub, adapter: Phoenix.PubSub.PG2],
  live_view: [signing_salt: "QHo3oWu3"]

# Configures Elixir's Logger
config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

# Module dependencies
config :whiteboard, :boards, Whiteboard.Boards

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{Mix.env()}.exs"
