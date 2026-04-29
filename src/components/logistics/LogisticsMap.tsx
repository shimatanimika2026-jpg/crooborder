import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, RotateCcw } from 'lucide-react';

// 修复Leaflet默认图标问题
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface LogisticsEvent {
  id: number;
  event_type: string;
  location: string;
  latitude: number;
  longitude: number;
  description: string;
  occurred_at: string;
}

interface LogisticsMapProps {
  events: LogisticsEvent[];
  currentLocation?: { latitude: number; longitude: number; location: string };
}

export default function LogisticsMap({ events, currentLocation }: LogisticsMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(events.length - 1);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // 初始化地图
    const map = L.map(mapContainerRef.current).setView([31.2304, 121.4737], 4);

    // 添加OpenStreetMap图层
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || events.length === 0) return;

    // 清除现有标记和线条
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        mapRef.current?.removeLayer(layer);
      }
    });

    // 显示到当前步骤的所有事件
    const visibleEvents = events.slice(0, currentStep + 1);
    const coordinates: [number, number][] = [];

    visibleEvents.forEach((event, index) => {
      const isLast = index === visibleEvents.length - 1;
      const isCurrent = currentLocation && isLast;

      // 创建标记
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div class="flex flex-col items-center">
            <div class="w-8 h-8 rounded-full ${
              isCurrent
                ? 'bg-primary animate-pulse'
                : event.event_type === 'delayed' || event.event_type === 'customs_hold'
                  ? 'bg-red-500'
                  : 'bg-secondary'
            } border-2 border-background flex items-center justify-center text-xs font-bold text-primary-foreground">
              ${index + 1}
            </div>
            <div class="mt-1 text-xs font-normal text-center whitespace-nowrap bg-background/90 px-2 py-1 rounded">
              ${event.location}
            </div>
          </div>
        `,
        iconSize: [80, 60],
        iconAnchor: [40, 30],
      });

      const marker = L.marker([event.latitude, event.longitude], { icon }).addTo(
        mapRef.current!
      );

      // 添加弹窗
      marker.bindPopup(`
        <div class="p-2">
          <p class="font-bold">${event.location}</p>
          <p class="text-sm text-muted-foreground">${event.description}</p>
          <p class="text-xs text-muted-foreground mt-1">
            ${new Date(event.occurred_at).toLocaleString()}
          </p>
        </div>
      `);

      coordinates.push([event.latitude, event.longitude]);
    });

    // 绘制路径
    if (coordinates.length > 1) {
      L.polyline(coordinates, {
        color: '#3b82f6',
        weight: 3,
        opacity: 0.7,
        dashArray: '10, 10',
      }).addTo(mapRef.current);
    }

    // 调整地图视图以显示所有标记
    if (coordinates.length > 0) {
      mapRef.current.fitBounds(coordinates, { padding: [50, 50] });
    }
  }, [events, currentStep, currentLocation]);

  // 播放控制
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= events.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, events.length]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStep(0);
  };

  const handleSliderChange = (value: number[]) => {
    setIsPlaying(false);
    setCurrentStep(value[0]);
  };

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground">暂无物流轨迹数据</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-normal">物流轨迹地图</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 地图容器 */}
        <div
          ref={mapContainerRef}
          className="h-[500px] w-full rounded-md border border-border"
        />

        {/* 轨迹回放控制 */}
        <div className="space-y-4 rounded-md border border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-normal">轨迹回放</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handlePlayPause}>
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* 进度条 */}
          <div className="space-y-2">
            <Slider
              value={[currentStep]}
              min={0}
              max={events.length - 1}
              step={1}
              onValueChange={handleSliderChange}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {events[currentStep]?.location || ''}
              </span>
              <span>
                {currentStep + 1} / {events.length}
              </span>
            </div>
          </div>

          {/* 当前事件信息 */}
          <div className="rounded-md bg-background p-3">
            <p className="text-sm font-normal">{events[currentStep]?.description}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(events[currentStep]?.occurred_at).toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
