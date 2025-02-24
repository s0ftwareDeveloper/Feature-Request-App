import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "../../../auth/[...nextauth]/route"
import { NextResponse } from "next/server"

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.role === "admin") {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const json = await request.json()
  const { status } = json

  if (!["pending", "planned", "completed"].includes(status)) {
    return new NextResponse("Invalid status", { status: 400 })
  }

  const updated = await prisma.featureRequest.update({
    where: {
      id: params.id,
    },
    data: {
      status,
    },
  })

  return NextResponse.json(updated)
}

