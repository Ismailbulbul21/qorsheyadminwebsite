export type Profile = {
  id: string
  email: string | null
  focus_type: string | null
  created_at: string | null
  notifications_enabled: boolean
  goal_reminder_day: number | null
  goal_reminder_time: string | null
  goal_reminder_interval_days: number | null
  focus_blocked_apps: unknown
  focus_default_duration_minutes: number
  focus_strict_mode: boolean
}

export type Subscription = {
  id: string
  user_id: string
  plan_type: string
  start_date: string
  end_date: string
  status: 'active' | 'expired' | 'canceled'
  payment_reference: string | null
  payment_channel: 'EVC' | 'ZAAD' | 'SAHAL' | 'CARD' | 'BANK' | null
  amount: number | null
  currency: string | null
  created_at: string | null
}

export type Plan = {
  id: string
  name: string
  plan_type: string
  amount_usd: number
  currency: string
  billing_interval_days: number | null
  is_active: boolean
  created_at: string | null
  updated_at: string | null
}

export type AuditLogEntry = {
  id: string
  admin_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  old_value: unknown
  new_value: unknown
  created_at: string
}
