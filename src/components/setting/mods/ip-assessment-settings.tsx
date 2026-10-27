import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useIpAssessmentKey } from '@/hooks/use-ip-assessment'
import { showNotice } from '@/services/notice-service'

export const IpAssessmentSettings = ({ onClose }: { onClose: () => void }) => {
  const { t } = useTranslation()
  const [apiKey, setApiKey] = useIpAssessmentKey()
  const [value, setValue] = useState(apiKey)

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('home.network.settings.title')}</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          {t('home.network.settings.description')}
        </Alert>
        <TextField
          fullWidth
          type="password"
          autoComplete="new-password"
          label="ipapi.is API Key"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          helperText={t('home.network.settings.keyHint')}
        />
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {t('home.network.settings.privacy')}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('shared.actions.cancel')}</Button>
        <Button
          variant="contained"
          onClick={() => {
            const key = value.trim()
            setApiKey(key)
            try {
              if (
                localStorage.getItem('ip-assessment-api-key') !==
                JSON.stringify(key)
              )
                throw new Error('Could not save API key')
              onClose()
            } catch (err) {
              showNotice.error(err)
            }
          }}
        >
          {t('shared.actions.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
