import { JobStatus } from '../enums/job-status.enum';

export const JOB_TRANSITIONS: Partial<Record<JobStatus, JobStatus[]>> = {
  [JobStatus.PENDING]: [JobStatus.ACCEPTED, JobStatus.QUEUED, JobStatus.REJECTED, JobStatus.CANCELLED],
  [JobStatus.QUEUED]: [JobStatus.ACCEPTED, JobStatus.CANCELLED],
  [JobStatus.ACCEPTED]: [JobStatus.ALLOCATED, JobStatus.CANCELLED, JobStatus.REJECTED],
  [JobStatus.ALLOCATED]: [JobStatus.DISPATCHED, JobStatus.CANCELLED],
  [JobStatus.DISPATCHED]: [JobStatus.EN_ROUTE, JobStatus.CANCELLED, JobStatus.FAILED],
  [JobStatus.EN_ROUTE]: [JobStatus.ARRIVED, JobStatus.FAILED],
  [JobStatus.ARRIVED]: [JobStatus.COLLECTING, JobStatus.FAILED],
  [JobStatus.COLLECTING]: [JobStatus.COLLECTED, JobStatus.FAILED],
  [JobStatus.COLLECTED]: [JobStatus.RETURNING],
  [JobStatus.RETURNING]: [JobStatus.AT_CENTER],
  [JobStatus.AT_CENTER]: [JobStatus.SENT_TO_LAB],
  [JobStatus.SENT_TO_LAB]: [JobStatus.LAB_RECEIVED],
  [JobStatus.LAB_RECEIVED]: [JobStatus.PROCESSING],
  [JobStatus.PROCESSING]: [JobStatus.REPORT_READY, JobStatus.FAILED],
  [JobStatus.REPORT_READY]: [JobStatus.REPORT_REVIEWED],
  [JobStatus.REPORT_REVIEWED]: [JobStatus.COMPLETED],
};