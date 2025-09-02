import DatabaseTest from '@/components/DatabaseTest'
import QuizDebug from '@/components/QuizDebug'

export default function TestPage() {
  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-white text-center mb-8">
          Database & Quiz Testing
        </h1>
        
        <div className="grid gap-8">
          <QuizDebug />
          <DatabaseTest />
        </div>
      </div>
    </div>
  )
}
