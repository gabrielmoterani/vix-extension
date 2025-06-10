import axe from "axe-core"

export interface WcagViolation {
  id: string
  impact?: string
  description: string
  nodes: Array<{ target: string[]; html: string }>
}

export class WcagCheckService {
  async runCheck(): Promise<WcagViolation[]> {
    const results = await axe.run()
    return results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      nodes: v.nodes.map((n) => ({
        target: n.target as string[],
        html: n.html
      }))
    }))
  }
}
