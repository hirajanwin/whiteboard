import {Socket} from "phoenix"
let socket = new Socket("/socket", {params: {}})

window.joinBoard = (boardCode) => {

  socket.connect()

  document.addEventListener("notepad:ready", event => {
    const notepad = event.detail;
    window.addEventListener("resize", () => {
      notepad.resize();
    });

    let channel = socket.channel(`board:${boardCode}`, {})

    document.addEventListener("notepad:stroke", event => {
      channel.push("notepad-cmd", { type: "stroke", stroke: event.detail.stroke });
    });
    document.addEventListener("notepad:undo", event => {
      channel.push("notepad-cmd", { type: "undo" });
    });
    document.addEventListener("notepad:redo", event => {
      channel.push("notepad-cmd", { type: "redo" });
    });

    channel.on("notepad-cmd", payload => {
      switch(payload.type) {
        case "stroke":
          notepad.addStroke(payload.stroke);
          break;
        case "undo":
          notepad.undo();
          break;
        case "redo":
          notepad.redo();
          break;
        default:
          console.warn("Recieved unknown notepad command:", payload);
      }
    });

    channel.join()
      .receive("ok", resp => { console.log("Joined successfully", resp) })
      .receive("error", resp => { console.log("Unable to join", resp) })
  });
}

export default socket
