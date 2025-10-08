import { useRouteError, isRouteErrorResponse } from "react-router-dom";
import Error from "../pages/_static/error";

export const ErrorBoundary = () => {
  const error = useRouteError() as Error;

  if (isRouteErrorResponse(error)) {
    return <Error type="uncaught" />;
  }

  const err = (error as Error).message.split("//");
  if (err.length === 3 && err[1] === ":") {
    return <Error type="caught" err={error} />;
  } else return <Error type="uncaught" />;
};
