import io

from rest_framework import generics, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Business, Channel
from .serializers import BusinessSerializer, ChannelSerializer

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
ALLOWED_EXTS = (".txt", ".md", ".markdown", ".pdf")


class BusinessListCreate(generics.ListCreateAPIView):
    queryset = Business.objects.all().order_by("-created_at")
    serializer_class = BusinessSerializer
    permission_classes = [IsAuthenticated]


class BusinessDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Business.objects.all()
    serializer_class = BusinessSerializer
    permission_classes = [IsAuthenticated]


class ChannelListCreate(generics.ListCreateAPIView):
    """List/create channels — accepts ?business=<id> filter."""
    serializer_class = ChannelSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Channel.objects.all().order_by("kind")
        biz = self.request.query_params.get("business")
        if biz:
            qs = qs.filter(business_id=biz)
        return qs

    def perform_create(self, serializer):
        # Channel needs a business; default to first if not provided.
        business_id = self.request.data.get("business")
        if business_id:
            business = Business.objects.filter(pk=business_id).first()
        else:
            business = Business.objects.first()
        serializer.save(business=business)


class ChannelDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Channel.objects.all()
    serializer_class = ChannelSerializer
    permission_classes = [IsAuthenticated]


class KnowledgeUploadView(APIView):
    """Extract text from an uploaded document and append it to the business's knowledge_base."""

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk: int):
        business = Business.objects.filter(pk=pk).first()
        if business is None:
            return Response({"detail": "Business not found."}, status=status.HTTP_404_NOT_FOUND)

        upload = request.FILES.get("file")
        if upload is None:
            return Response({"detail": "Missing 'file' field."}, status=status.HTTP_400_BAD_REQUEST)
        if upload.size > MAX_UPLOAD_BYTES:
            return Response(
                {"detail": f"File too large (max {MAX_UPLOAD_BYTES // 1024 // 1024} MB)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        name = (upload.name or "document").strip()
        ext = "." + name.rsplit(".", 1)[-1].lower() if "." in name else ""
        if ext not in ALLOWED_EXTS:
            return Response(
                {"detail": f"Unsupported file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTS)}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        raw = upload.read()
        try:
            if ext == ".pdf":
                text = _extract_pdf(raw)
            else:
                text = raw.decode("utf-8", errors="replace")
        except Exception as exc:
            return Response({"detail": f"Failed to read document: {exc}"}, status=status.HTTP_400_BAD_REQUEST)

        text = text.strip()
        if not text:
            return Response({"detail": "Document had no extractable text."}, status=status.HTTP_400_BAD_REQUEST)

        header = f"\n\n--- {name} ---\n"
        existing = business.knowledge_base or ""
        business.knowledge_base = (existing + header + text).strip()
        business.save(update_fields=["knowledge_base", "updated_at"])

        return Response({
            "ok": True,
            "filename": name,
            "characters_added": len(text),
            "knowledge_base": business.knowledge_base,
        })


def _extract_pdf(raw: bytes) -> str:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(raw))
    return "\n\n".join((page.extract_text() or "") for page in reader.pages)
