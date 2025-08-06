document.addEventListener("DOMContentLoaded", () => {
  const sendBtn = document.querySelector("#send");
  const receiveBtn = document.querySelector("#receive");
  const fileInput = document.querySelector("#fileInput");

  sendBtn.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;

    document.body.innerHTML = "<h2> Sending...</h2>";
    const formData = new FormData();
    // formData.append("file", file);
    for (const file of fileInput.files) {
      formData.append("files", file);
    }

    try {
      const res = await fetch("/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        document.body.innerHTML = "<h2>SUCCESS!!!</h2>";
      } else {
        document.body.innerHTML = "<h2>Upload failed</h2>";
      }
    } catch (err) {
      document.body.innerHTML = "<h2>Error during upload</h2>";
    }
  });

  receiveBtn.addEventListener("click", () => {
    window.location.href = "/receive";
  });
});
