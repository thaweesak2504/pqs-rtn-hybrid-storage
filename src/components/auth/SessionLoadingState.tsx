import LoadingSpinner from '../ui/LoadingSpinner'

interface SessionLoadingStateProps {
  label?: string
}

/**
 * A quiet startup state for short session checks. The motion is revealed only
 * after a small delay, avoiding a readable-text flash when restoration is fast.
 */
const SessionLoadingState = ({ label = 'กำลังตรวจสอบสถานะผู้ใช้' }: SessionLoadingStateProps) => (
  <div
    className="flex min-h-[40vh] items-center justify-center"
    role="status"
    aria-label={label}
  >
    <LoadingSpinner
      size="md"
      color="secondary"
      className="session-loading-motion"
    />
    <span className="sr-only">{label}</span>
  </div>
)

export default SessionLoadingState
