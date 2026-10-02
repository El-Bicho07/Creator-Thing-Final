"""Initial schema setup

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-09-28 13:25:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Ensure pgvector extension exists if running on PostgreSQL
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        'projects',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('creator_handle', sa.String(length=100), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'posts',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('project_id', sa.String(), nullable=False),
        sa.Column('original_id', sa.String(), nullable=True),
        sa.Column('caption', sa.Text(), nullable=False),
        sa.Column('hashtags', sa.JSON(), nullable=True),
        sa.Column('media_path', sa.String(), nullable=True),
        sa.Column('post_type', sa.String(), nullable=True),
        sa.Column('published_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'post_text_features',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('post_id', sa.String(), nullable=False),
        sa.Column('char_count', sa.Integer(), nullable=True),
        sa.Column('word_count', sa.Integer(), nullable=True),
        sa.Column('sentence_count', sa.Integer(), nullable=True),
        sa.Column('paragraph_count', sa.Integer(), nullable=True),
        sa.Column('avg_sentence_length', sa.Float(), nullable=True),
        sa.Column('avg_word_length', sa.Float(), nullable=True),
        sa.Column('punctuation_counts', sa.JSON(), nullable=True),
        sa.Column('question_count', sa.Integer(), nullable=True),
        sa.Column('exclamation_count', sa.Integer(), nullable=True),
        sa.Column('line_break_count', sa.Integer(), nullable=True),
        sa.Column('has_bullet_points', sa.Integer(), nullable=True),
        sa.Column('has_numbered_list', sa.Integer(), nullable=True),
        sa.Column('capitalization_style', sa.String(), nullable=True),
        sa.Column('emoji_count', sa.Integer(), nullable=True),
        sa.Column('emojis', sa.JSON(), nullable=True),
        sa.Column('hashtag_count', sa.Integer(), nullable=True),
        sa.Column('has_cta', sa.Integer(), nullable=True),
        sa.Column('cta_phrase', sa.String(), nullable=True),
        sa.Column('has_url', sa.Integer(), nullable=True),
        sa.Column('vocabulary_stats', sa.JSON(), nullable=True),
        sa.Column('first_person_ratio', sa.Float(), nullable=True),
        sa.Column('second_person_ratio', sa.Float(), nullable=True),
        sa.Column('formality_score', sa.Float(), nullable=True),
        sa.Column('conversational_score', sa.Float(), nullable=True),
        sa.Column('educational_score', sa.Float(), nullable=True),
        sa.Column('promotional_score', sa.Float(), nullable=True),
        sa.Column('storytelling_score', sa.Float(), nullable=True),
        sa.Column('structure_components', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['post_id'], ['posts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'post_visual_features',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('post_id', sa.String(), nullable=False),
        sa.Column('width', sa.Integer(), nullable=True),
        sa.Column('height', sa.Integer(), nullable=True),
        sa.Column('aspect_ratio', sa.Float(), nullable=True),
        sa.Column('brightness', sa.Float(), nullable=True),
        sa.Column('contrast', sa.Float(), nullable=True),
        sa.Column('saturation', sa.Float(), nullable=True),
        sa.Column('dominant_colors', sa.JSON(), nullable=True),
        sa.Column('color_histogram', sa.JSON(), nullable=True),
        sa.Column('text_area_ratio', sa.Float(), nullable=True),
        sa.Column('ocr_text', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['post_id'], ['posts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'style_profiles',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('project_id', sa.String(), nullable=False),
        sa.Column('tone_scores', sa.JSON(), nullable=True),
        sa.Column('caption_stats', sa.JSON(), nullable=True),
        sa.Column('formatting_patterns', sa.JSON(), nullable=True),
        sa.Column('emoji_profile', sa.JSON(), nullable=True),
        sa.Column('hashtag_profile', sa.JSON(), nullable=True),
        sa.Column('cta_profile', sa.JSON(), nullable=True),
        sa.Column('common_structures', sa.JSON(), nullable=True),
        sa.Column('vocabulary_profile', sa.JSON(), nullable=True),
        sa.Column('visual_profile', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('project_id')
    )

    op.create_table(
        'embeddings',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('post_id', sa.String(), nullable=False),
        sa.Column('vector', sa.JSON(), nullable=False),
        sa.Column('dimension', sa.String(), nullable=True),
        sa.Column('model_name', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['post_id'], ['posts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('post_id')
    )

    op.create_table(
        'generated_drafts',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('project_id', sa.String(), nullable=False),
        sa.Column('topic', sa.Text(), nullable=False),
        sa.Column('post_type', sa.String(), nullable=True),
        sa.Column('hook', sa.Text(), nullable=True),
        sa.Column('caption', sa.Text(), nullable=False),
        sa.Column('cta', sa.Text(), nullable=True),
        sa.Column('hashtags', sa.JSON(), nullable=True),
        sa.Column('slides', sa.JSON(), nullable=True),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'validation_results',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('draft_id', sa.String(), nullable=False),
        sa.Column('overall_score', sa.Float(), nullable=True),
        sa.Column('metrics_breakdown', sa.JSON(), nullable=True),
        sa.Column('originality_status', sa.String(), nullable=True),
        sa.Column('max_ngram_overlap', sa.Float(), nullable=True),
        sa.Column('flagged_phrases', sa.JSON(), nullable=True),
        sa.Column('retrieved_examples_used', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['draft_id'], ['generated_drafts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('draft_id')
    )

def downgrade() -> None:
    op.drop_table('validation_results')
    op.drop_table('generated_drafts')
    op.drop_table('embeddings')
    op.drop_table('style_profiles')
    op.drop_table('post_visual_features')
    op.drop_table('post_text_features')
    op.drop_table('posts')
    op.drop_table('projects')
