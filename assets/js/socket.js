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
      channel.push("stroke", event.detail);
    });

    channel.on("stroke", payload => {
      notepad.addStroke(payload.stroke);
    })

    channel.join()
      .receive("ok", resp => { console.log("Joined successfully", resp) })
      .receive("error", resp => { console.log("Unable to join", resp) })
  });
}

export default socket
