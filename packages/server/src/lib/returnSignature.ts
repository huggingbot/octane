import { createAssessment } from './reCaptcha'
import { NextRequest } from 'next/server'

type AllowAllConfig = {
  type: 'allowAll'
}

type ReCaptchaConfig = {
  type: 'reCaptcha'
  reCaptchaProjectId: string
  reCaptchaSiteKey: string
  reCaptchaMinScore: number
}

export type ReturnSignatureConfigField = AllowAllConfig | ReCaptchaConfig

export async function isReturnedSignatureAllowed(
  request: NextRequest,
  config: ReturnSignatureConfigField
): Promise<boolean> {
  if (config.type === 'allowAll') {
    return true
  }
  if (config.type == 'reCaptcha') {
    const body = await request.json()
    const reCaptchaToken = body.reCaptchaToken
    if (typeof reCaptchaToken !== 'string') {
      return false
    }
    const reCaptchaAssessment = await createAssessment(
      config.reCaptchaProjectId,
      process.env.RECAPTCHA_API_KEY!,
      reCaptchaToken,
      config.reCaptchaSiteKey,
      'octane'
    )
    if (!reCaptchaAssessment.tokenProperties.valid) {
      return false
    }
    return reCaptchaAssessment.riskAnalysis.score >= config.reCaptchaMinScore
  }
  return true
}
