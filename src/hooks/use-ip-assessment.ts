import { useLocalStorage } from 'foxact/use-local-storage'

import { getIpAssessment } from '@/services/ip-assessment'
import { useQuery } from '@/services/query-client'

export const useIpAssessmentKey = () =>
  useLocalStorage('ip-assessment-api-key', '')

export const useIpAssessment = () => {
  const [apiKey] = useIpAssessmentKey()
  return useQuery({
    queryKey: ['ipAssessment', apiKey],
    queryFn: () => getIpAssessment(apiKey),
    staleTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  })
}
