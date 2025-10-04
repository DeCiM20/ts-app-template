import cors from "cors";

const corsOptions = {
  origin: ["http://localhost:5173"], // Update to match your URL
  credentials: true,
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
};

export default cors(corsOptions);
