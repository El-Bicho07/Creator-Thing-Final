import { DELETE as deleteGeneration } from '../../generations/[id]/route';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return deleteGeneration(request, { params });
}
