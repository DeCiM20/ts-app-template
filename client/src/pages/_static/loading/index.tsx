import { Loader2 } from "lucide-react"

const Loading = () => {
  return (
    <div className="h-screen flex justify-center items-center -mt-12">
      <Loader2 className="w-20 h-20 text-primary mx-auto mb-6 animate-spin" />
    </div>
  )
}

export default Loading
