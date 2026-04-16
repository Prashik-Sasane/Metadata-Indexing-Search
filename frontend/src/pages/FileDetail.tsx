import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { filesAPI } from '../api/client';
import { useState } from 'react';

function FileDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newTag, setNewTag] = useState('');

  const { data: fileData, isLoading } = useQuery({
    queryKey: ['file', id],
    queryFn: () => filesAPI.getById(id!),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => filesAPI.delete(id!),
    onSuccess: () => {
      navigate('/search');
    },
  });

  const updateTagsMutation = useMutation({
    mutationFn: (tags: Record<string, boolean>) =>
      filesAPI.updateTags(id!, tags),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['file', id] });
    },
  });

  const handleAddTag = () => {
    if (!newTag || !fileData?.data?.tags) return;
    const updatedTags = { ...fileData.data.tags, [newTag]: true };
    updateTagsMutation.mutate(updatedTags);
    setNewTag('');
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this file?')) {
      deleteMutation.mutate();
    }
  };

  if (isLoading) {
    return <div className="loading">Loading file details...</div>;
  }

  if (!fileData?.data) {
    return <div className="error">File not found</div>;
  }

  const file = fileData.data;

  return (
    <div>
      <button
        className="btn btn-secondary"
        onClick={() => navigate(-1)}
        style={{ marginBottom: '20px' }}
      >
        ← Back
      </button>

      <div className="card">
        <h1 className="card-title" style={{ fontSize: '28px' }}>
          {file.name}
        </h1>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginTop: '24px' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              File ID
            </label>
            <p style={{ fontSize: '14px', fontFamily: 'monospace' }}>{file.id}</p>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              S3 Key
            </label>
            <p style={{ fontSize: '14px', fontFamily: 'monospace' }}>{file.s3_key}</p>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Size
            </label>
            <p style={{ fontSize: '18px', fontWeight: 600 }}>{file.sizeFormatted}</p>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              MIME Type
            </label>
            <p style={{ fontSize: '16px' }}>{file.mime_type || 'N/A'}</p>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Bucket
            </label>
            <p style={{ fontSize: '16px' }}>{file.bucket}</p>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Created
            </label>
            <p style={{ fontSize: '16px' }}>
              {new Date(file.created_at).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Tags Section */}
      <div className="card">
        <h2 className="card-title">Tags</h2>
        <div style={{ marginBottom: '16px' }}>
          {file.tags && Object.keys(file.tags).map((tag: string) => (
            <span key={tag} className="tag" style={{ margin: '4px' }}>
              {tag}
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            className="filter-input"
            placeholder="Add new tag..."
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" onClick={handleAddTag}>
            Add Tag
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="card">
        <h2 className="card-title">Actions</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-success">
            Download File
          </button>
          <button className="btn btn-secondary" onClick={handleDelete}>
            Delete File
          </button>
        </div>
      </div>
    </div>
  );
}

export default FileDetail;
