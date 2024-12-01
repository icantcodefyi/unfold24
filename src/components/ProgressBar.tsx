import { motion } from 'framer-motion'

interface ProgressBarProps {
  progress: number
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  return (
    <div className="w-full h-2 bg-purple-900/30 rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-purple-500"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5 }}
      />
    </div>
  )
}

