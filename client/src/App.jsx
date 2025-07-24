import React, { useState } from "react";
import "./App.css";

function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [uploaded, setUploaded] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setUploaded(false);
    setResults([]);
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a CSV file.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:3500/evaluate", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setResults(data);
      setUploaded(true);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed. Check server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Student Answer Evaluator</h1>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        disabled={uploaded || loading}
      />
      <br />
      <button onClick={handleUpload} disabled={uploaded || loading}>
        {loading ? "Evaluating..." : "Upload & Evaluate"}
      </button>

      {uploaded && results.length > 0 && (
        <div className="results">
          <h2>Results:</h2>
          {results.map((student, idx) => (
            <div className="student" key={idx}>
              <h3>{student.name}</h3>
              <p>Total Score: {student.total}</p>
              <ul>
                {student.detailedScores.map((s, i) => (
                  <li key={i}>
                    <strong>Q{i + 1}:</strong> Score: {s.score}, {s.explanation}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
