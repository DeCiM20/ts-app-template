import { Link } from "react-router-dom"

const NotFound = () => {
  return (
    <div className="h-screen flex justify-center items-center container mx-auto px-4 md:px-8 lg:px-12 xl:px-16 -mt-16">
      <div className="text-center -mt-28 md:-mt-40">
        <h2 className="md:text-[10rem] text-9xl font-bold">404</h2>
        <div className="text-3xl md:text-4xl mt-8">Oops! Page Not Found</div>
        <div className="mt-6 opacity-75 max-w-xl">
          It looks like the page you're looking for doesn't exist or has been
          moved. Please check the URL or head back to the{" "}
          <Link to="/" className="text-primary px-1">homepage</Link> to find what you're looking for.
        </div>
      </div>
    </div>
  )
}

export default NotFound
