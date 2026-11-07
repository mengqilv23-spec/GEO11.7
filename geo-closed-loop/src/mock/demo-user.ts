export interface DemoUserInfo {
  customerId: string
  siteId: string
  tenantId: string
  userId: string
  userName: string
  accountId: string
  accountCategory: number | null
}

export function getDemoUserInfo(): DemoUserInfo {
  return { customerId: 'demo-customer', siteId: 'demo-site-apw', tenantId: 'demo-tenant', userId: '1001', userName: '演示用户', accountId: 'demo-account', accountCategory: null }
}

