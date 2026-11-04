import { NextResponse } from "next/server"
import {
  registerDealership,
  getRegisteredDealerships,
  toggleDealershipStatus,
} from "@/app/actions/dealership"

export async function GET() {
  try {
    const orgs = await getRegisteredDealerships()
    return NextResponse.json({ success: true, data: orgs })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const result = await registerDealership(body)

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { organizationId, status } = body

    if (!organizationId) {
      return NextResponse.json(
        { success: false, message: "organizationId is required" },
        { status: 400 }
      )
    }

    const result = await toggleDealershipStatus(organizationId, status)
    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    )
  }
}

